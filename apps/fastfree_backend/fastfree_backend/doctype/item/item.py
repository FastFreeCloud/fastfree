# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class Item(Document):
    def validate(self):
        self.validate_rate()

    def validate_rate(self):
        if flt(self.standard_rate) < 0:
            frappe.throw(_("Standard Rate cannot be negative"))
