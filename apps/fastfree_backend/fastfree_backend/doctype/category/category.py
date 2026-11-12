# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Category(Document):
    def validate(self):
        self.validate_parent()

    def validate_parent(self):
        if self.parent_category and self.parent_category == self.name:
            frappe.throw(_("A category cannot be its own parent"))
