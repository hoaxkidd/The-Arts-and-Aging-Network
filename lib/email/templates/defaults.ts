import { EmailTemplateType } from '../types'

export interface DefaultTemplate {
  type: EmailTemplateType
  name: string
  subject: string
  content: string
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    type: 'INVITATION',
    name: 'Account Invitation',
    subject: "You're invited to join {{appUrl}}",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">{{appUrl}}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Welcome to our community</p>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          You've been invited to join <strong>{{appUrl}}</strong> as a <strong>{{role}}</strong>.
        </p>
        <p style="margin: 0 0 30px; color: #374151; font-size: 15px;">
          Click the button below to set your password and activate your account.
        </p>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{inviteUrl}}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Accept Invitation
          </a>
        </div>
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">If the button doesn't work, copy and paste this link:</p>
        <p style="margin: 0 0 20px; color: #4F46E5; font-size: 13px; word-break: break-all;">
          <a href="{{inviteUrl}}" style="color: #4F46E5;">{{inviteUrl}}</a>
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
      </div>
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">{{appUrl}} | {{supportEmail}}</p>
      </div>
    </div>`,
  },
  {
    type: 'WELCOME',
    name: 'Welcome Email',
    subject: 'Welcome to {{appUrl}}!',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome!</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Welcome to <strong>{{appUrl}}</strong>! We're excited to have you as part of our community.
        </p>
        <p style="margin: 0 0 30px; color: #374151; font-size: 15px;">
          {{message}}
        </p>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{appUrl}}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Get Started
          </a>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          If you have any questions, don't hesitate to reach out to {{supportEmail}}
        </p>
      </div>
    </div>`,
  },
  {
    type: 'RSVP_CONFIRMATION',
    name: 'RSVP Confirmation',
    subject: 'RSVP Confirmed: {{eventTitle}}',
    content: `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: #10B981; padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">✓ RSVP Confirmed</h1>
      </div>
      <div style="background: #ffffff; padding: 35px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 25px; color: #374151; font-size: 16px;">
          Your RSVP to <strong style="color: #4F46E5;">{{eventTitle}}</strong> has been confirmed! We look forward to seeing you there.
        </p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 0 0 25px; border-left: 4px solid #4F46E5;">
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>📅 Date:</strong> <time datetime="{{eventDateISO}}">{{eventDate}}</time></p>
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>🕐 Time:</strong> <time datetime="{{eventTimeISO}}">{{eventTime}}</time></p>
          <p style="margin: 0; color: #111827; font-size: 15px;"><strong>📍 Location:</strong> <a href="{{googleMapsUrl}}" target="_blank" style="color: #4F46E5; text-decoration: underline;">{{eventLocation}}</a></p>
        </div>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{eventLink}}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            View Event Details
          </a>
        </div>
        {{calendarSection}}
        <p style="margin: 20px 0 0; color: #9ca3af; font-size: 13px; text-align: center;">
          Need to cancel? Update your RSVP from the event page.
        </p>
      </div>
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;"><a href="{{appUrl}}" style="color: #6b7280;">{{appUrlDisplay}}</a> | {{supportEmail}}</p>
      </div>
    </div>`,
  },
  {
    type: 'RSVP_CANCELLED',
    name: 'RSVP Cancelled',
    subject: 'RSVP Cancelled: {{eventTitle}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #EF4444; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✕ RSVP Cancelled</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Your RSVP to <strong>{{eventTitle}}</strong> has been cancelled.
        </p>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{eventLink}}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Find Other Events
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'NEW_MESSAGE',
    name: 'New Message',
    subject: 'You have a new message from {{name}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #4F46E5; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Message</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          You have a new message:
        </p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 20px; border-left: 4px solid #4F46E5;">
          <p style="margin: 0; color: #374151; font-size: 15px; white-space: pre-wrap;">{{message}}</p>
        </div>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{appUrl}}/messages" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            View Messages
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'EVENT_REMINDER',
    name: 'Event Reminder',
    subject: 'Reminder: {{eventTitle}} is coming up!',
    content: `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Event Reminder</h1>
      </div>
      <div style="background: #ffffff; padding: 35px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 25px; color: #374151; font-size: 16px;">
          Don't forget! You're scheduled for <strong style="color: #4F46E5;">{{eventTitle}}</strong> coming up soon.
        </p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 0 0 25px; border-left: 4px solid #F59E0B;">
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>📅 Date:</strong> <time datetime="{{eventDateISO}}">{{eventDate}}</time></p>
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>🕐 Time:</strong> <time datetime="{{eventTimeISO}}">{{eventTime}}</time></p>
          <p style="margin: 0; color: #111827; font-size: 15px;"><strong>📍 Location:</strong> <a href="{{googleMapsUrl}}" target="_blank" style="color: #4F46E5; text-decoration: underline;">{{eventLocation}}</a></p>
        </div>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{eventLink}}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            View Event Details
          </a>
        </div>
        {{calendarSection}}
        <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">
          Remember to check in 24 hours before the event!
        </p>
      </div>
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;"><a href="{{appUrl}}" style="color: #6b7280;">{{appUrlDisplay}}</a> | {{supportEmail}}</p>
      </div>
    </div>`,
  },
  {
    type: 'EVENT_REQUEST_APPROVED',
    name: 'Event Request Approved',
    subject: 'Your event request has been approved!',
    content: `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">✓ Event Approved!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Your request has been confirmed</p>
      </div>
      <div style="background: #ffffff; padding: 35px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 25px; color: #374151; font-size: 16px;">
          Great news! Your event request for <strong style="color: #4F46E5;">{{eventTitle}}</strong> has been approved!
        </p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 0 0 25px; border-left: 4px solid #10B981;">
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>📅 Date:</strong> <time datetime="{{eventDateISO}}">{{eventDate}}</time></p>
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>🕐 Time:</strong> <time datetime="{{eventTimeISO}}">{{eventTime}}</time></p>
          <p style="margin: 0; color: #111827; font-size: 15px;"><strong>📍 Location:</strong> <a href="{{googleMapsUrl}}" target="_blank" style="color: #4F46E5; text-decoration: underline;">{{eventLocation}}</a></p>
        </div>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{eventLink}}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            View Event Details
          </a>
        </div>
        {{calendarSection}}
        <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">
          We look forward to seeing you at the event!
        </p>
      </div>
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;"><a href="{{appUrl}}" style="color: #6b7280;">{{appUrlDisplay}}</a> | {{supportEmail}}</p>
      </div>
    </div>`,
  },
  {
    type: 'EXPENSE_APPROVED',
    name: 'Expense Approved',
    subject: 'Your expense has been approved!',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10B981; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✓ Expense Approved</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Great news! Your expense of <strong>{{expenseAmount}}</strong> has been approved.
        </p>
        <p style="margin: 0 0 30px; color: #374151; font-size: 15px;">
          {{message}}
        </p>
        <div style="text-align: center;">
          <a href="{{appUrl}}/expenses" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            View Expenses
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'EXPENSE_REJECTED',
    name: 'Expense Rejected',
    subject: 'Your expense has been rejected',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #EF4444; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✕ Expense Rejected</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Your expense of <strong>{{expenseAmount}}</strong> has been rejected.
        </p>
        <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 0 0 20px; border-left: 4px solid #EF4444;">
          <p style="margin: 0; color: #991B1B; font-size: 15px;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0 0; color: #991B1B; font-size: 15px; white-space: pre-wrap;">{{message}}</p>
        </div>
        <div style="text-align: center;">
          <a href="{{appUrl}}/expenses" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            View & Resubmit
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'TIMESHEET_APPROVED',
    name: 'Timesheet Approved',
    subject: 'Your timesheet has been approved!',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10B981; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✓ Timesheet Approved</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Your timesheet for <strong>{{timesheetWeek}}</strong> has been approved!
        </p>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{appUrl}}/timesheets" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            View Timesheets
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'TIMESHEET_REJECTED',
    name: 'Timesheet Rejected',
    subject: 'Your timesheet needs revision',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #EF4444; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✕ Timesheet Needs Revision</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Your timesheet for <strong>{{timesheetWeek}}</strong> requires revision.
        </p>
        <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 0 0 20px; border-left: 4px solid #EF4444;">
          <p style="margin: 0; color: #991B1B; font-size: 15px;"><strong>Feedback:</strong></p>
          <p style="margin: 10px 0 0; color: #991B1B; font-size: 15px; white-space: pre-wrap;">{{message}}</p>
        </div>
        <div style="text-align: center;">
          <a href="{{appUrl}}/timesheets" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            View & Revise
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'PASSWORD_RESET',
    name: 'Password Reset',
    subject: 'Reset your password',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #4F46E5; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Reset Password</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          You requested to reset your password. Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{inviteUrl}}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="margin: 0 0 10px; color: #9ca3af; font-size: 12px;">This link will expire in 1 hour.</p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    </div>`,
  },
  {
    type: 'FEEDBACK_REQUEST',
    name: 'Post-Event Feedback',
    subject: 'How was {{eventTitle}}? Share your feedback!',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">We'd Love Your Feedback!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Help us improve future events</p>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 25px; color: #374151; font-size: 16px;">
          Thank you for attending <strong style="color: #4F46E5;">{{eventTitle}}</strong>! Your participation made the event special.
        </p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 0 0 25px; border-left: 4px solid #8B5CF6;">
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>📅 Date:</strong> <time datetime="{{eventDateISO}}">{{eventDate}}</time></p>
          <p style="margin: 0 0 12px; color: #111827; font-size: 15px;"><strong>🕐 Time:</strong> <time datetime="{{eventTimeISO}}">{{eventTime}}</time></p>
          <p style="margin: 0; color: #111827; font-size: 15px;"><strong>📍 Location:</strong> {{eventLocation}}</p>
        </div>
        <p style="margin: 0 0 25px; color: #374151; font-size: 15px;">
          Your feedback helps us create better experiences for everyone. Please take a moment to share your thoughts!
        </p>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{feedbackUrl}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Share Your Feedback
          </a>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          This feedback form takes about 2 minutes to complete. Your responses are confidential and help us improve.
        </p>
      </div>
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;"><a href="{{appUrl}}" style="color: #6b7280;">{{appUrlDisplay}}</a> | {{supportEmail}}</p>
      </div>
    </div>`,
  },
  {
    type: 'GROUP_ACCESS_REQUEST',
    name: 'Group Access Request',
    subject: 'New group access request',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #F59E0B; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Group Access Request</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          <strong>{{name}}</strong> has requested to join <strong>{{groupName}}</strong>.
        </p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 0 0 20px;">
          <p style="margin: 0; color: #374151; font-size: 15px; white-space: pre-wrap;">{{message}}</p>
        </div>
        <div style="text-align: center;">
          <a href="{{appUrl}}/admin/communication" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Review Request
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'GROUP_ACCESS_APPROVED',
    name: 'Group Access Approved',
    subject: 'You can now access {{groupName}}',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #10B981; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✓ Access Approved</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Your request to join <strong>{{groupName}}</strong> has been approved!
        </p>
        <div style="text-align: center; margin: 0 0 30px;">
          <a href="{{appUrl}}/messages" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600;">
            Go to Group
          </a>
        </div>
      </div>
    </div>`,
  },
  {
    type: 'GROUP_ACCESS_DENIED',
    name: 'Group Access Denied',
    subject: 'Your group access request was denied',
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #EF4444; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">✕ Access Denied</h1>
      </div>
      <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px; color: #111827; font-size: 16px;">Hi {{name}},</p>
        <p style="margin: 0 0 20px; color: #374151; font-size: 15px;">
          Your request to join <strong>{{groupName}}</strong> was not approved at this time.
        </p>
        <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 0 0 20px; border-left: 4px solid #EF4444;">
          <p style="margin: 0; color: #991B1B; font-size: 15px;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0 0; color: #991B1B; font-size: 15px; white-space: pre-wrap;">{{message}}</p>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          You can request access to other groups at any time.
        </p>
      </div>
    </div>`,
  },
]

export function getDefaultTemplate(type: EmailTemplateType): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.type === type)
}

export function getAllDefaultTemplates(): DefaultTemplate[] {
  return DEFAULT_TEMPLATES
}
