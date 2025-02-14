import frappe

def insert():
    report_name = "Material Request Invoice Status"

    if not frappe.db.exists("Report", report_name):
        report = frappe.get_doc({
            "doctype": "Report",
            "report_name": report_name,
            "ref_doctype": "Material Request",
            "module": "Stock",
            "is_standard": "Yes",
            "report_type": "Script Report",
            "json": "{}",
            "script": "",
            "disabled": 0
        })
        report.insert(ignore_permissions=True)
        frappe.db.commit()
        frappe.msgprint(f"Report '{report_name}' has been created successfully.")
    else:
        frappe.msgprint(f"Report '{report_name}' already exists.")
