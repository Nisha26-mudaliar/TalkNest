export function createWelcomeEmailTemplate(name, otp) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - TalkNest</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    
    <div style="background: linear-gradient(to right, #36D1DC, #5B86E5); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 500;">
        Welcome to TalkNest!
      </h1>
    </div>

    <div style="background-color: #ffffff; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      
      <p style="font-size: 18px; color: #5B86E5;">
        <strong>Hello ${name},</strong>
      </p>

      <p>
        Thank you for signing up for <strong>TalkNest</strong> 🎉
      </p>

      <p>
        Use the verification code below to confirm your email address.
        Enter this code on the verification page:
      </p>

      <!-- ✅ OTP CODE BOX - works on all devices, no links needed -->
      <div style="text-align: center; margin: 35px 0;">
        <div style="display: inline-block; background: linear-gradient(135deg, #f0f4ff, #e8f0fe); border: 2px solid #5B86E5; border-radius: 12px; padding: 20px 40px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 2px;">
            Verification Code
          </p>
          <p style="margin: 0; font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #5B86E5;">
            ${otp}
          </p>
        </div>
      </div>

      <p style="text-align: center; color: #666;">
        This code expires in <strong>24 hours</strong>.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />

      <p style="color: #999; font-size: 13px;">
        If you did not create a TalkNest account, you can safely ignore this email.
      </p>

      <p style="margin-top: 25px;">
        Best regards,<br>
        <strong>The TalkNest Team</strong>
      </p>

    </div>

    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
      <p>© 2026 TalkNest. All rights reserved.</p>
    </div>

  </body>
  </html>
  `;
}