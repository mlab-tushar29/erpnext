import frappe
from datetime import datetime, timedelta

def update_next_execution(doc, method=None):
    # Debug log to check function execution
    frappe.logger().info(f"🔄 Before Save Triggered for {doc.name}")

    if not doc.custom_scheduled_time:
        frappe.logger().warning("⚠️ No scheduled time set. Skipping update.")
        return

    try:
        # Convert scheduled_time field (HH:MM:SS) to hours and minutes
        scheduled_time_str = str(doc.custom_scheduled_time)
        time_parts = scheduled_time_str.split(":")
        hours, minutes = int(time_parts[0]), int(time_parts[1])

        # Get current time
        now = datetime.now()

        # Set next execution datetime for today at the specified time
        next_execution = now.replace(hour=hours, minute=minutes, second=0, microsecond=0)

        # If the time has already passed today, schedule it for tomorrow
        if next_execution <= now:
            next_execution += timedelta(days=1)

        # Set the computed next execution time
        doc.next_execution = next_execution

        # Debug log
        frappe.logger().info(f"✅ Next execution time set to: {doc.next_execution}")
        frappe.msgprint(f"Next execution time updated to {doc.next_execution}", alert=True)

    except Exception as e:
        frappe.logger().error(f"❌ Error updating next execution: {str(e)}")
        frappe.throw(f"Error updating execution time: {str(e)}")
