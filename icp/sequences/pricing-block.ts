/**
 * Reusable HTML pricing block for Day 9 emails.
 * Inline styles only — email client safe.
 */
export function pricingBlock(): string {
  return `
<br>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;">
  <tr>
    <td style="padding:20px 0 10px 0;">
      <strong style="font-size:16px;">What you get. What it costs.</strong>
    </td>
  </tr>

  <!-- Row -->
  <tr style="border-bottom:1px solid #e5e5e5;">
    <td style="padding:12px 0;">
      <strong>New website</strong><br>
      <span style="color:#555;font-size:13px;">Fast, mobile-first, built for Google + AI search from day one. Live in 14 days.</span>
    </td>
    <td style="padding:12px 0;text-align:right;vertical-align:top;white-space:nowrap;">
      <strong>Included</strong>
    </td>
  </tr>

  <!-- Row -->
  <tr style="border-bottom:1px solid #e5e5e5;">
    <td style="padding:12px 0;">
      <strong>Daily content publishing</strong><br>
      <span style="color:#555;font-size:13px;">Posts targeting your city, services, nearby towns, seasons — automatically.</span>
    </td>
    <td style="padding:12px 0;text-align:right;vertical-align:top;white-space:nowrap;">
      <strong>Included</strong>
    </td>
  </tr>

  <!-- Row -->
  <tr style="border-bottom:1px solid #e5e5e5;">
    <td style="padding:12px 0;">
      <strong>AI search indexing</strong><br>
      <span style="color:#555;font-size:13px;">Structured so ChatGPT, Gemini, and voice search can find and recommend you.</span>
    </td>
    <td style="padding:12px 0;text-align:right;vertical-align:top;white-space:nowrap;">
      <strong>Included</strong>
    </td>
  </tr>

  <!-- Row -->
  <tr style="border-bottom:1px solid #e5e5e5;">
    <td style="padding:12px 0;">
      <strong>Client messaging + follow-up</strong><br>
      <span style="color:#555;font-size:13px;">Automated rebooking, inquiry follow-up, no leads going cold.</span>
    </td>
    <td style="padding:12px 0;text-align:right;vertical-align:top;white-space:nowrap;">
      <strong>Included</strong>
    </td>
  </tr>

  <!-- Row -->
  <tr style="border-bottom:1px solid #e5e5e5;">
    <td style="padding:12px 0;">
      <strong>Social engagement</strong><br>
      <span style="color:#555;font-size:13px;">Automated commenting and engagement — stays active without you touching it.</span>
    </td>
    <td style="padding:12px 0;text-align:right;vertical-align:top;white-space:nowrap;">
      <strong>Included</strong>
    </td>
  </tr>

  <!-- Row -->
  <tr style="border-bottom:1px solid #e5e5e5;">
    <td style="padding:12px 0;">
      <strong>Onboarding + business ops</strong><br>
      <span style="color:#555;font-size:13px;">New clients come in organized. Everything documented and visible.</span>
    </td>
    <td style="padding:12px 0;text-align:right;vertical-align:top;white-space:nowrap;">
      <strong>Included</strong>
    </td>
  </tr>

  <!-- Price Row -->
  <tr style="background:#f9f9f9;">
    <td style="padding:16px 12px;">
      <strong style="font-size:15px;">Monthly retainer</strong><br>
      <span style="color:#555;font-size:13px;">Everything above. No setup fee. Cancel anytime.</span>
    </td>
    <td style="padding:16px 12px;text-align:right;vertical-align:middle;">
      <strong style="font-size:22px;">$997<span style="font-size:14px;font-weight:normal;">/mo</span></strong>
    </td>
  </tr>
</table>
<br>
`;
}
