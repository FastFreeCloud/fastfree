import frappe
from frappe import _


DOCTYPE = "Employee"

DEFAULT_FIELDS = [
    "name",
    "employee_name",
    "employee_number",
    "department",
    "designation",
    "date_of_joining",
    "status",
    "gender",
    "date_of_birth",
    "email",
    "phone",
    "address",
]


def _check_permission(doctype, perm_type):
    if not frappe.has_permission(doctype, perm_type):
        frappe.throw(_("Not permitted"), frappe.PermissionError)


@frappe.whitelist()
def get_list(filters=None, fields=None, limit_start=0, limit_page_length=20, order_by="modified desc"):
    """Return a list of Employee records."""
    _check_permission(DOCTYPE, "read")

    if not fields:
        fields = DEFAULT_FIELDS

    return frappe.get_list(
        DOCTYPE,
        filters=filters,
        fields=fields,
        limit_start=int(limit_start or 0),
        limit_page_length=int(limit_page_length or 20),
        order_by=order_by,
    )


@frappe.whitelist()
def get(name):
    """Return a single Employee record."""
    _check_permission(DOCTYPE, "read")

    if not name:
        frappe.throw(_("Employee name (id) is required"))

    doc = frappe.get_doc(DOCTYPE, name)
    return doc.as_dict()


@frappe.whitelist()
def create(**kwargs):
    """Create a new Employee record."""
    _check_permission(DOCTYPE, "create")

    doc = frappe.new_doc(DOCTYPE)
    doc.update(kwargs)
    doc.save()
    frappe.db.commit()
    return doc.as_dict()


@frappe.whitelist()
def update(name, **kwargs):
    """Update an existing Employee record."""
    _check_permission(DOCTYPE, "write")

    if not name:
        frappe.throw(_("Employee name (id) is required"))

    doc = frappe.get_doc(DOCTYPE, name)
    doc.update(kwargs)
    doc.save()
    frappe.db.commit()
    return doc.as_dict()


@frappe.whitelist()
def delete(name):
    """Delete an Employee record."""
    _check_permission(DOCTYPE, "delete")

    if not name:
        frappe.throw(_("Employee name (id) is required"))

    doc = frappe.get_doc(DOCTYPE, name)
    doc.delete()
    frappe.db.commit()
    return {"message": _("Employee deleted successfully")}