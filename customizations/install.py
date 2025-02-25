from customizations.custom_demo_app.doctype.email_campaign_scheduler.email_campaign_scheduler import \
    create_email_campaign_scheduler_doctype
from customizations.report.crud.material_request_invoice_report import insert


def after_install():
    insert()
    create_email_campaign_scheduler_doctype()
