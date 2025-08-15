import { NextRequest, NextResponse } from 'next/server';
import { KPICalculator } from '@/lib/kpi/calculator';
import { SlackIntegration } from '@/lib/notifications/slack-integration';

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackMessage {
  text: string;
  blocks: SlackBlock[];
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('🚫 Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⏰ Daily KPI Report Cron Job Started');
    
    // Calculate latest KPIs
    const calculator = new KPICalculator();
    const snapshot = await calculator.runFullKPICalculation();
    
    // Format data for Slack
    const slackMessage = formatKPIForSlack(snapshot);
    
    // Send standard KPI report to Slack
    const slackResponse = await sendSlackNotification(slackMessage);
    
    // Send enhanced CFO Intelligence report
    console.log('📊 Sending CFO Intelligence Report...');
    try {
      const cfoReport = await SlackIntegration.sendDailyReport();
      console.log('✅ CFO Intelligence Report sent:', cfoReport.success ? 'Success' : 'Failed');
    } catch (cfoError) {
      console.error('⚠️ CFO Intelligence Report failed (non-critical):', cfoError);
      // Don't fail the entire cron job if CFO report fails
    }
    
    console.log('✅ Daily KPI Report Sent Successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Daily KPI report sent to Slack',
      timestamp: new Date().toISOString(),
      kpis: {
        cashOnHand: snapshot.kpis.cashOnHand,
        daysCashRunway: snapshot.kpis.daysCashRunway,
        yesterdayRevenue: snapshot.kpis.yesterdayRevenue,
        grossMargin: snapshot.kpis.grossMarginPercentage
      },
      alertsCount: snapshot.alerts.length,
      slackStatus: slackResponse.ok ? 'sent' : 'failed'
    });

  } catch (error) {
    console.error('❌ Daily KPI Report Cron Job Failed:', error);
    
    // Send error notification to Slack
    await sendErrorNotification(error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function formatKPIForSlack(snapshot: any): SlackMessage {
  const { kpis, alerts } = snapshot;
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Determine overall status
  const criticalAlerts = alerts.filter((alert: any) => alert.type === 'critical');
  const warningAlerts = alerts.filter((alert: any) => alert.type === 'warning');
  const positiveAlerts = alerts.filter((alert: any) => alert.type === 'positive');

  let statusEmoji = '📊';
  let statusText = 'Stable';
  
  if (criticalAlerts.length > 0) {
    statusEmoji = '🚨';
    statusText = 'Critical Issues';
  } else if (warningAlerts.length > 0) {
    statusEmoji = '⚠️';
    statusText = 'Needs Attention';
  } else if (positiveAlerts.length > 0) {
    statusEmoji = '🎉';
    statusText = 'Performing Well';
  }

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji} Freckled Hen Daily KPI Report - ${currentDate}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Business Status:* ${statusText}\n*Report Time:* ${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Chicago' })} CST`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*💰 Cash on Hand*\n$${kpis.cashOnHand.toLocaleString()}`
        },
        {
          type: 'mrkdwn',
          text: `*⏰ Cash Runway*\n${kpis.daysCashRunway} days`
        },
        {
          type: 'mrkdwn',
          text: `*📈 Yesterday Revenue*\n$${kpis.yesterdayRevenue.toLocaleString()}`
        },
        {
          type: 'mrkdwn',
          text: `*📦 Units Shipped*\n${kpis.unitsShippedYesterday} units`
        }
      ]
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*📅 Week Progress*\n${kpis.wtdProgress.percentage}% ($${kpis.wtdProgress.actual.toLocaleString()}/$${kpis.wtdProgress.target.toLocaleString()})`
        },
        {
          type: 'mrkdwn',
          text: `*📅 ${currentMonth} Progress*\n${kpis.mtdProgress.percentage}% ($${kpis.mtdProgress.actual.toLocaleString()}/$${kpis.mtdProgress.target.toLocaleString()})`
        },
        {
          type: 'mrkdwn',
          text: `*💹 Gross Margin*\n${kpis.grossMarginPercentage}%`
        },
        {
          type: 'mrkdwn',
          text: `*🚨 Active Alerts*\n${alerts.length} alerts`
        }
      ]
    }
  ];

  // Add alerts section if there are any
  if (alerts.length > 0) {
    const alertText = alerts
      .sort((a: any, b: any) => a.priority - b.priority)
      .slice(0, 5) // Limit to top 5 alerts
      .map((alert: any) => {
        const emoji = alert.type === 'critical' ? '🚨' : 
                      alert.type === 'warning' ? '⚠️' : '🎉';
        return `${emoji} ${alert.message}`;
      })
      .join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📋 Key Alerts:*\n${alertText}`
      }
    });
  }

  // Add action buttons
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*🔗 Quick Actions:*\n• <https://freckled-hen-system.vercel.app/dashboard/kpi|View Live Dashboard>\n• <https://freckled-hen-system.vercel.app/dashboard|System Overview>`
    }
  });

  return {
    text: `Freckled Hen Daily KPI Report - ${statusText}`,
    blocks
  };
}

async function sendSlackNotification(message: SlackMessage): Promise<Response> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL environment variable not set');
  }

  console.log('📨 Sending KPI report to Slack...');
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack notification failed: ${response.status} ${errorText}`);
  }

  console.log('✅ KPI report sent to Slack successfully');
  return response;
}

async function sendErrorNotification(error: unknown): Promise<void> {
  try {
    const errorMessage = {
      text: '🚨 Freckled Hen KPI System Error',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 KPI System Error Alert'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error Time:* ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST\n*Error:* ${error instanceof Error ? error.message : 'Unknown error'}\n\n*Action Required:* Check system logs and resolve the issue.`
          }
        }
      ]
    };

    await sendSlackNotification(errorMessage);
  } catch (slackError) {
    console.error('❌ Failed to send error notification to Slack:', slackError);
  }
}