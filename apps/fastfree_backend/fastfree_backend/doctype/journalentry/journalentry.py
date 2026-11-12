# Copyright (c) 2026, FastFree Cloud and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class JournalEntry(Document):
    def validate(self):
        self.set_title()
        self.validate_entry()

    def set_title(self):
        party = self.party or self.account or ""
        if party:
            self.title = f"{self.voucher_type} - {party}"
        else:
            self.title = self.voucher_type

    def validate_entry(self):
        if flt(self.debit) and flt(self.credit):
            frappe.throw(_("Debit and Credit cannot both be entered on one line"))
        self.total_debit = flt(self.debit)
        self.total_credit = flt(self.credit)
        self.difference = flt(self.total_debit) - flt(self.total_credit)

    def on_submit(self):
        if flt(self.total_debit) != flt(self.total_credit):
            frappe.throw(_("Debit and Credit must be equal before submitting"))
