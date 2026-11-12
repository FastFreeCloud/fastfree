# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Warehouse(Document):
    def validate(self):
        self.validate_parent()

    def validate_parent(self):
        if self.parent_warehouse and self.parent_warehouse == self.name:
            frappe.throw(_("A warehouse cannot be its own parent"))
