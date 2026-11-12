# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Department(Document):
    def validate(self):
        self.validate_parent()

    def validate_parent(self):
        if self.parent_department and self.parent_department == self.name:
            frappe.throw(_("A department cannot be its own parent"))
