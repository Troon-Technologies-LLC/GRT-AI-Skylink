const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Resolve TIME_ZONE from environment to an IANA zone or use system local if not set
function resolveTimeZone(tzEnv) {
  if (!tzEnv) return null; // system local timezone
  const tz = tzEnv.trim();
  const m = tz.match(/^UTC?\s*([+-]\d{1,2})$/i) || tz.match(/^([+-]\d{1,2})$/);
  if (m) {
    const offset = parseInt(m[1], 10);
    const sign = offset >= 0 ? '-' : '+'; // Etc/GMT sign inversion
    const abs = Math.abs(offset);
    return `Etc/GMT${sign}${abs}`;
  }
  return tz; // assume IANA
}

const RESOLVED_TZ = resolveTimeZone(process.env.TIME_ZONE);

function fmtDate(date = new Date()) {
  const opts = { dateStyle: 'medium', timeStyle: 'medium' };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...opts, timeZone: RESOLVED_TZ } : opts);
  const s = fmt.format(date);
  // Normalize any 24:MM(:SS)? at start or after whitespace/comma to 00:MM(:SS)?
  return s
    .replace(/(^|[\s,])24:(\d{2})(?::(\d{2}))?/g, (m, p1, mm, ss) => `${p1}00:${mm}${ss ? `:${ss}` : ''}`);
}

function fmtTime(date = new Date()) {
  const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...opts, timeZone: RESOLVED_TZ } : opts);
  const timeStr = fmt.format(date);
  // Fix any leading 24:MM(:SS)? to 00:MM(:SS)?
  return timeStr.replace(/^24:(\d{2})(?::(\d{2}))?/, (m, mm, ss) => `00:${mm}${ss ? `:${ss}` : ''}`);
}

function fmtDateOnly(date = new Date()) {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...opts, timeZone: RESOLVED_TZ } : opts);
  return fmt.format(date);
}

class EmailReporter {
  constructor() {
    this.testResults = [];
    this.hourlyTimer = null;
    this.lastReportTime = new Date();
    
    // Email configuration - Custom SMTP for troontechnologies.com
    this.emailConfig = {
      host: 'smtp.gmail.com', // Gmail SMTP for custom domain
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };
    
    this.recipients = [
      process.env.REPORT_EMAIL
    ];
    
    this.transporter = nodemailer.createTransport(this.emailConfig);
  }

  // Start hourly email reporting
  startHourlyReporting() {
    console.log('📧 Starting hourly email reporting...');
    
    // Send report every hour (3600000 ms)
    this.hourlyTimer = setInterval(() => {
      this.sendHourlyReport();
    }, 60 * 60 * 1000); // 1 hour
    
    // Also send initial report after 5 minutes for testing
    setTimeout(() => {
      console.log('📧 Sending initial test report...');
      this.sendHourlyReport();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop hourly reporting
  stopHourlyReporting() {
    if (this.hourlyTimer) {
      clearInterval(this.hourlyTimer);
      this.hourlyTimer = null;
      console.log('📧 Hourly email reporting stopped');
    }
  }

  // Log test result
  logTestResult(testData) {
    const result = {
      timestamp: new Date(),
      testCycle: testData.testCycle,
      dayName: testData.dayName,
      currentTime: testData.currentTime,
      location: testData.location,
      device: testData.device,
      timeSlot: testData.timeSlot,
      status: testData.status,
      responseStatus: testData.responseStatus,
      error: testData.error || null
    };
    
    this.testResults.push(result);
    
    // Keep only last 24 hours of results to prevent memory issues
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.testResults = this.testResults.filter(result => result.timestamp > oneDayAgo);
  }

  // Get results from last hour
  getLastHourResults() {
    // Return results since the last time we sent a report.
    // This avoids edge cases where a strict rolling 1-hour window only captures 1 entry
    // due to timing alignment of the interval vs. test cycles.
    const since = this.lastReportTime || new Date(Date.now() - 60 * 60 * 1000);
    return this.testResults.filter(result => result.timestamp > since);
  }

  // Generate HTML email report
  generateEmailReport(results) {
    const now = new Date();
    const reportPeriod = `${fmtDate(this.lastReportTime)} - ${fmtDate(now)}`;
    
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.status === 'success').length;
    const awayTests = results.filter(r => r.status === 'away').length;
    const failedTests = results.filter(r => r.status === 'error').length;
    const successRate = totalTests > 0 ? ((successfulTests / totalTests) * 100).toFixed(1) : 0;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #2196F3; color: white; padding: 15px; border-radius: 5px; }
            .summary { background-color: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .test-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .test-table th, .test-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .test-table th { background-color: #f2f2f2; }
            .success { color: #4CAF50; font-weight: bold; }
            .error { color: #f44336; font-weight: bold; }
            .no-test { color: #ff9800; font-style: italic; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>🔍 Skylink Sensor Testing - Hourly Report</h2>
            <p>Report Period: ${reportPeriod}</p>
            <p>Timezone: ${process.env.TIME_ZONE ? process.env.TIME_ZONE : 'System Local'}</p>
        </div>
        
        <div class="summary">
            <h3>📊 Summary</h3>
            <p><strong>Total Tests:</strong> ${totalTests}</p>
            <p><strong>Successful:</strong> <span class="success">${successfulTests}</span></p>
            <p><strong>Away from Home:</strong> <span class="no-test">${awayTests}</span></p>
            <p><strong>Failed:</strong> <span class="error">${failedTests}</span></p>
            <p><strong>Success Rate:</strong> ${successRate}%</p>
        </div>`;

    if (totalTests > 0) {
      html += `
        <h3>📋 Test Details</h3>
        <table class="test-table">
            <tr>
                <th>Time</th>
                <th>Cycle #</th>
                <th>Day</th>
                <th>Location</th>
                <th>Device</th>
                <th>Time Slot</th>
                <th>Status</th>
                <th>Response</th>
            </tr>`;

      results.forEach(result => {
        let statusClass, statusText;
        
        if (result.status === 'success') {
          statusClass = 'success';
          statusText = '✅ Success';
        } else if (result.status === 'away') {
          statusClass = 'no-test';
          statusText = '🏠 Away from Home';
        } else {
          statusClass = 'error';
          statusText = '❌ Failed';
        }
        
        html += `
            <tr>
                <td>${fmtTime(result.timestamp)}</td>
                <td>${result.testCycle}</td>
                <td>${result.dayName}</td>
                <td>${result.location || 'N/A'}</td>
                <td>${result.device || 'N/A'}</td>
                <td>${result.timeSlot || 'No active slot'}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${result.responseStatus || 'N/A'}</td>
            </tr>`;
      });

      html += `</table>`;
    } else {
      html += `<p class="no-test">⏰ No tests were executed in the last hour (outside of scheduled time slots)</p>`;
    }

    html += `
        <div style="margin-top: 20px; padding: 10px; background-color: #e3f2fd; border-radius: 5px;">
            <p><strong>🤖 Skylink Sensor Scheduler Status:</strong> Running 24/7</p>
            <p><strong>⏰ Next Report:</strong> ${fmtDate(new Date(Date.now() + 60 * 60 * 1000))}</p>
        </div>
    </body>
    </html>`;

    return html;
  }

  // Send hourly email report
  async sendHourlyReport() {
    try {
      const results = this.getLastHourResults();
      const htmlContent = this.generateEmailReport(results);
      
      const now = new Date();
      const hourOnly = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { hour: '2-digit', hour12: false, timeZone: RESOLVED_TZ } : { hour: '2-digit', hour12: false }).format(now);
      const fixedHour = hourOnly === '24' ? '00' : hourOnly;
      const subject = `Skylink Sensor Report - ${fmtDateOnly(now)} ${fixedHour}:00`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: this.recipients.join(', '),
        subject: subject,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Hourly report sent successfully to: ${this.recipients.join(', ')}`);
      console.log(`📊 Report included ${results.length} test results from the last hour`);
      
      this.lastReportTime = now;
      
    } catch (error) {
      console.error('❌ Failed to send hourly report:', error.message);
    }
  }

  // Test email configuration
  async testEmailConnection() {
    try {
      // Skip email verification if credentials are not provided
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email credentials not configured - email reporting disabled');
        return false;
      }
      
      await this.transporter.verify();
      console.log('✅ Email configuration is valid');
      return true;
    } catch (error) {
      console.error('❌ Email configuration error:', error.message);
      console.log('💡 For Gmail: You need an App Password, not your regular password');
      console.log('💡 Visit: https://support.google.com/accounts/answer/185833');
      return false;
    }
  }
}

module.exports = EmailReporter;
