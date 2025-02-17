import frappe
import json
from frappe.desk.query_report import (
    get_report_doc, validate_filters_permissions, generate_report_result, get_prepared_report_result, run as core_run
)
from frappe.utils import sbool

# List of reports that should use custom logic
CUSTOM_REPORTS = ["Material Request Invoice Status"]


@frappe.whitelist()
@frappe.read_only()
def run(
        report_name,
        filters=None,
        user=None,
        ignore_prepared_report=False,
        custom_columns=None,
        is_tree=False,
        parent_field=None,
        are_default_filters=True,
):
    # Check if the report should use custom logic
    if report_name in CUSTOM_REPORTS:

        if not user:
            user = frappe.session.user

        validate_filters_permissions(report_name, filters, user)
        report = get_report_doc(report_name)

        if not frappe.has_permission(report.ref_doctype, "report"):
            frappe.throw("Must have report permission to access this report.")

        result = None

        if sbool(are_default_filters) and report.custom_filters:
            filters = report.custom_filters

        try:
            if report.prepared_report and not sbool(ignore_prepared_report) and not custom_columns:
                if filters:
                    if isinstance(filters, str):
                        filters = json.loads(filters)

                    dn = filters.pop("prepared_report_name", None)
                else:
                    dn = ""
                result = get_prepared_report_result(report, filters, dn, user)
            else:
                # Custom logic for fetching report data
                columns = [
                    {"label": "Material Request", "fieldname": "name", "fieldtype": "Link", "options": "Material Request", "width": 200},
                    {"label": "Workflow State", "fieldname": "workflow_state", "fieldtype": "Data", "width": 150},
                    {"label": "Title", "fieldname": "title", "fieldtype": "Data", "width": 200},
                    {"label": "Company", "fieldname": "company", "fieldtype": "Link", "options": "Company", "width": 200},
                    {"label": "Required By", "fieldname": "schedule_date", "fieldtype": "Date", "width": 120},
                    {"label": "Set Target Warehouse", "fieldname": "set_warehouse", "fieldtype": "Link", "options": "Warehouse", "width": 200},
                    {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 150},
                    {"label": "% Ordered", "fieldname": "per_ordered", "fieldtype": "Float", "width": 120},
                    {"label": "% Received", "fieldname": "per_received", "fieldtype": "Float", "width": 120},
                    {"label": "Invoice ID", "fieldname": "purchase_invoice_id", "fieldtype": "Link", "options": "Purchase Invoice", "width": 200},
                    {"label": "Invoice Status", "fieldname": "purchase_invoice_status", "fieldtype": "Data", "width": 150}

                ]
                res = []
                material_requests = frappe.get_all(
                    "Material Request",
                    fields=[
                        "name", "workflow_state", "title", "company", "schedule_date",
                        "set_warehouse", "status", "per_ordered",
                        "per_received"
                    ]
                )

                for mr in material_requests:
                    purchase_orders = frappe.get_all(
                        "Purchase Order",
                        filters={"material_request": mr["name"]},
                        fields=["name"]
                    )

                    invoice_status = "None"
                    invoice_id = ""
                    for po in purchase_orders:
                        invoices = frappe.get_all(
                            "Purchase Invoice",
                            filters={"purchase_order": po["name"]},
                            fields=["name", "status"]
                        )
                        if invoices:
                            invoice_status = ", ".join(set(i["status"] for i in invoices))
                            invoice_id = ", ".join(set(i["name"] for i in invoices))

                    res.append({
                        "name": mr["name"],
                        "workflow_state": mr["workflow_state"],
                        "title": mr["title"],
                        "company": mr["company"],
                        "schedule_date": mr["schedule_date"],
                        "set_warehouse": mr["set_warehouse"],
                        "status": mr["status"],
                        "per_ordered": mr["per_ordered"],
                        "per_received": mr["per_received"],
                        "purchase_invoice_status": invoice_status,
                        "purchase_invoice_id": invoice_id
                    })

                result = {"columns": columns, "result": res}

        except Exception as e:
            frappe.log_error(f"Custom Report Error: {str(e)}")
            raise

        result["add_total_row"] = report.add_total_row and not result.get("skip_total_row", False)

        if sbool(are_default_filters) and report.custom_filters:
            result["custom_filters"] = report.custom_filters

        return result

    # If report is not in the custom list, call the core method
    return core_run(
        report_name, filters, user, ignore_prepared_report, custom_columns, is_tree, parent_field, are_default_filters
    )