import frappe
import logging
logger = frappe.logger("customizations")
logger.setLevel(logging.DEBUG)


def create_email_campaign_scheduler_doctype():
    # Check if the DocType already exists
    if not frappe.db.exists("DocType", "Email Campaign Scheduler"):
        # Create the DocType
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Email Campaign Scheduler",
            "module": "Custom Demo App",  # Ensure consistent naming
            "is_single": 1,  # Treat as a single document in the UI
            "custom": 1,  # Mark as custom DocType
            "fields": [
                {
                    "fieldname": "email_campaign_scheduled_time",
                    "fieldtype": "Time",
                    "label": "Scheduled Time",
                    "reqd": 1  # Make the field required
                }
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,  # Allow read access
                    "write": 1,  # Allow write access
                    "create": 0,  # Disallow creation
                    "delete": 0  # Disallow deletion
                }
            ]
        })
        doc.insert()  # Insert the DocType into the database
        frappe.db.commit()  # Commit the transaction
        print("✅ Email Campaign Scheduler DocType created.")
    else:
        print("⏩ Email Campaign Scheduler DocType already exists.")


    records = frappe.db.get_all("Email Campaign Scheduler", limit=1)
    if not records:
        scheduler_doc = frappe.get_doc({
            "doctype": "Email Campaign Scheduler",
            "email_campaign_scheduled_time": "14:00:00"
        })
        scheduler_doc.insert()
        frappe.db.commit()
        logger.info("Initiating check")
        print("✅ Record inserted successfully.")