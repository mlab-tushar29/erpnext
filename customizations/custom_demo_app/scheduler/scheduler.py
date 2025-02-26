import frappe
from datetime import datetime
from erpnext.crm.doctype.email_campaign.email_campaign import send_email_to_leads_or_contacts

logger = frappe.logger("customizations")


def send_campaign_email():
    logger.info("Initiating check")
    records = frappe.get_all(
                    "Email Campaign Scheduler",
                    fields=[
                        "email_campaign_scheduled_time"
                    ]
                )

    if not records:
        frappe.log_error("Scheduled time not found in Email Campaign Scheduler.")
        return

    current_time = datetime.now().time()
    hour, minute, _ = map(int, str(records[0]['email_campaign_scheduled_time']).split(":"))

    if current_time.hour == hour and current_time.minute == minute:
        send_email_to_leads_or_contacts()
        logger.info(f"✅ Emails sent successfully at the scheduled time {current_time}")