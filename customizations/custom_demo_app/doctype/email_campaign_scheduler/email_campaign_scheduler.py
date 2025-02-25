import frappe

def create_email_campaign_scheduler_doctype():
    if not frappe.db.exists("DocType", "Email Campaign Scheduler"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "module": "Custom Demo app",
            "custom": 1,
            "fields": [
                {
                    "fieldname": "email_campaign_scheduled_time",
                    "fieldtype": "Datetime",
                    "label": "Scheduled Time"
                }
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1
                }
            ]
        })
        doc.insert()
        frappe.db.commit()
        print("✅ Email Campaign Scheduler Doctype created.")
