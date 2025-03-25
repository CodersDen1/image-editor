// backend/config/email.js
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Email Configuration
 * ------------------
 * Settings for email delivery service and templates
 * 
 * Environment variables:
 * - EMAIL_SERVICE: Email service (e.g., 'smtp', 'sendgrid', 'mailgun')
 * - EMAIL_HOST: SMTP host
 * - EMAIL_PORT: SMTP port
 * - EMAIL_USER: SMTP username/API key
 * - EMAIL_PASS: SMTP password/API secret
 * - EMAIL_FROM: Default sender email
 * - EMAIL_FROM_NAME: Default sender name
 */

// Email provider configuration
const emailConfig = {
  provider: process.env.EMAIL_SERVICE || 'smtp',
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || ''
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || '',
    domain: process.env.MAILGUN_DOMAIN || ''
  },
  defaults: {
    from: {
      name: process.env.EMAIL_FROM_NAME || 'RealEstate ImagePro',
      email: process.env.EMAIL_FROM || 'noreply@realestateimagepro.com'
    }
  }
};

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to RealEstate ImagePro',
    template: 'welcome'
  },
  verifyEmail: {
    subject: 'Please verify your email address',
    template: 'verify-email'
  },
  passwordReset: {
    subject: 'Password Reset Request',
    template: 'password-reset'
  },
  shareNotification: {
    subject: 'Images shared with you',
    template: 'share-notification'
  },
  processingComplete: {
    subject: 'Your images have been processed',
    template: 'processing-complete'
  },
  accountUpdate: {
    subject: 'Your account has been updated',
    template: 'account-update'
  }
};

// Create email transporter based on configuration
let transporter = null;

/**
 * Initialize the email transporter
 * @returns {Object} - Nodemailer transporter
 */
const initializeTransporter = () => {
  if (transporter) {
    return transporter;
  }
  
  switch (emailConfig.provider) {
    case 'sendgrid':
      if (!emailConfig.sendgrid.apiKey) {
        console.warn('⚠️  SendGrid API key not configured. Email functionality will not work.');
        return null;
      }
      
      transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: emailConfig.sendgrid.apiKey
        }
      });
      break;
      
    case 'mailgun':
      if (!emailConfig.mailgun.apiKey || !emailConfig.mailgun.domain) {
        console.warn('⚠️  Mailgun API key or domain not configured. Email functionality will not work.');
        return null;
      }
      
      const mg = require('nodemailer-mailgun-transport');
      transporter = nodemailer.createTransport(mg({
        auth: {
          api_key: emailConfig.mailgun.apiKey,
          domain: emailConfig.mailgun.domain
        }
      }));
      break;
      
    case 'smtp':
    default:
      if (!emailConfig.smtp.host || !emailConfig.smtp.auth.user) {
        console.warn('⚠️  SMTP configuration incomplete. Email functionality will not work.');
        
        if (process.env.NODE_ENV === 'development') {
          // Use Ethereal for testing in development
          console.log('📧 Setting up Ethereal test account for email testing...');
          return createTestAccount();
        }
        
        return null;
      }
      
      transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.auth.user,
          pass: emailConfig.smtp.auth.pass
        }
      });
  }
  
  return transporter;
};

/**
 * Create a test email account for development
 * @returns {Object} - Test email transporter
 */
const createTestAccount = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('📧 Ethereal test account created:');
    console.log('- Username:', testAccount.user);
    console.log('- Password:', testAccount.pass);
    console.log('- Preview URL: https://ethereal.email/login');
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('❌ Error creating test email account:', error);
    return null;
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name
 * @param {Object} options.data - Template data
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async (options) => {
  try {
    const transport = initializeTransporter();
    
    if (!transport) {
      throw new Error('Email transporter not initialized');
    }
    
    // Set up email data
    const mailOptions = {
      from: `"${emailConfig.defaults.from.name}" <${emailConfig.defaults.from.email}>`,
      to: options.to,
      subject: options.subject || 'Message from RealEstate ImagePro',
      html: options.html || '',
      text: options.text || ''
    };
    
    // Use template if specified
    if (options.template) {
      const template = emailTemplates[options.template];
      
      if (!template) {
        throw new Error(`Email template '${options.template}' not found`);
      }
      
      mailOptions.subject = options.subject || template.subject;
      
      // In a real implementation, you would render the template with the data
      // This is a simplified version that assumes you have a template engine
      // mailOptions.html = await renderTemplate(template.template, options.data);
      
      // For now, we'll just use a simple placeholder
      mailOptions.html = `<h1>${mailOptions.subject}</h1><p>This is a placeholder for the ${options.template} template.</p>`;
      mailOptions.text = `${mailOptions.subject}\n\nThis is a placeholder for the ${options.template} template.`;
    }
    
    // Send the email
    const info = await transport.sendMail(mailOptions);
    
    // Log preview URL if using Ethereal
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      console.log('📧 Email sent:', info.messageId);
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  emailConfig,
  emailTemplates,
  initializeTransporter,
  sendEmail
};