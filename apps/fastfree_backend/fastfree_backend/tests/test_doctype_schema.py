"""Static schema tests for the fastfree_backend DocTypes.

These tests do not require a running Frappe site or a database. They validate
that every DocType definition follows the conventions Frappe relies on when it
syncs ``doctype/*.json`` into the database during ``bench migrate``:

* the JSON is well formed and carries the mandatory DocType keys,
* ``field_order`` matches the declared fields exactly (no orphans, no duplicates),
* every ``fieldtype`` / ``options`` combination Frappe accepts is used,
* ``autoname`` / ``is_tree`` / ``is_submittable`` conventions are respected,
* each controller defines a class named after the DocType and compiles,
* every DocType belongs to a module declared in ``modules.txt``.

Run with ``pytest`` (or ``python -m unittest``) from the app directory.
"""

import json
import unittest
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1]
DOCTYPE_DIR = APP_DIR / "doctype"
MODULES_FILE = APP_DIR / "modules.txt"

# The 16 DocTypes this task is responsible for, plus the pre-existing Employee.
REQUIRED_DOCTYPES = [
    "Department",
    "Designation",
    "Customer",
    "Supplier",
    "Item",
    "Category",
    "Warehouse",
    "Account",
    "JournalEntry",
    "Invoice",
    "Payment",
    "SalesOrder",
    "PurchaseOrder",
    "Attendance",
    "LeaveApplication",
    "SalaryStructure",
]

# Field types understood by Frappe (mirrors DocField.fieldtype options).
VALID_FIELDTYPES = {
    "Autocomplete",
    "Attach",
    "Attach Image",
    "Attachment Gallery",
    "Barcode",
    "Button",
    "Check",
    "Code",
    "Color",
    "Column Break",
    "Currency",
    "Data",
    "Date",
    "Datetime",
    "Duration",
    "Dynamic Link",
    "Float",
    "Fold",
    "Geolocation",
    "Heading",
    "HTML",
    "HTML Editor",
    "Icon",
    "Image",
    "Int",
    "JSON",
    "Link",
    "Long Text",
    "Markdown Editor",
    "Password",
    "Percent",
    "Phone",
    "Read Only",
    "Rating",
    "Section Break",
    "Select",
    "Signature",
    "Small Text",
    "Tab Break",
    "Table",
    "Table MultiSelect",
    "Text",
    "Text Editor",
    "Time",
    "Vue Component",
}

MANDATORY_DOCTYPE_KEYS = (
    "name",
    "module",
    "doctype",
    "field_order",
    "fields",
    "permissions",
)


def _load(name):
    path = DOCTYPE_DIR / name / f"{name.lower()}.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _modules():
    return {
        line.strip()
        for line in MODULES_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


class DocTypeFileLayoutTest(unittest.TestCase):
    """Every required DocType is present with its three files."""

    def test_all_required_doctypes_exist(self):
        missing = [name for name in REQUIRED_DOCTYPES if not (DOCTYPE_DIR / name).is_dir()]
        self.assertEqual(missing, [], f"missing DocType folders: {missing}")

    def test_each_doctype_has_json_controller_and_init(self):
        problems = []
        for name in REQUIRED_DOCTYPES:
            folder = DOCTYPE_DIR / name
            for filename in (
                "__init__.py",
                f"{name.lower()}.json",
                f"{name.lower()}.py",
            ):
                if not (folder / filename).is_file():
                    problems.append(f"{name}: missing {filename}")
        self.assertEqual(problems, [], "; ".join(problems))

    def test_controller_class_matches_doctype(self):
        problems = []
        for name in REQUIRED_DOCTYPES:
            source = (DOCTYPE_DIR / name / f"{name.lower()}.py").read_text(
                encoding="utf-8"
            )
            compile(source, str(DOCTYPE_DIR / name / f"{name.lower()}.py"), "exec")
            if f"class {name}(" not in source:
                problems.append(f"{name}: controller class not found")
        self.assertEqual(problems, [], "; ".join(problems))


class DocTypeSchemaTest(unittest.TestCase):
    """The JSON payloads satisfy Frappe's DocType schema rules."""

    def setUp(self):
        self.definitions = {}
        for name in REQUIRED_DOCTYPES:
            try:
                self.definitions[name] = _load(name)
            except FileNotFoundError:
                self.fail(f"{name}.json not found")

    def test_mandatory_keys_present(self):
        problems = []
        for name, definition in self.definitions.items():
            for key in MANDATORY_DOCTYPE_KEYS:
                if key not in definition:
                    problems.append(f"{name}: missing key {key!r}")
            if definition.get("doctype") != "DocType":
                problems.append(f"{name}: doctype must be 'DocType'")
        self.assertEqual(problems, [], "; ".join(problems))

    def test_name_matches_folder(self):
        problems = [
            f"{name}: name is {definition.get('name')!r}"
            for name, definition in self.definitions.items()
            if definition.get("name") != name
        ]
        self.assertEqual(problems, [], "; ".join(problems))

    def test_module_is_registered(self):
        modules = _modules()
        problems = [
            f"{name}: module {definition.get('module')!r} not in modules.txt"
            for name, definition in self.definitions.items()
            if definition.get("module") not in modules
        ]
        self.assertEqual(problems, [], "; ".join(problems))

    def test_field_order_matches_fields(self):
        problems = []
        for name, definition in self.definitions.items():
            declared = [field["fieldname"] for field in definition["fields"]]
            ordered = definition["field_order"]
            if len(declared) != len(set(declared)):
                problems.append(f"{name}: duplicate fieldname in fields")
            if sorted(declared) != sorted(ordered):
                problems.append(
                    f"{name}: field_order mismatch "
                    f"(missing={sorted(set(declared) - set(ordered))}, "
                    f"extra={sorted(set(ordered) - set(declared))})"
                )
        self.assertEqual(problems, [], "; ".join(problems))

    def test_fieldtypes_and_options(self):
        problems = []
        for name, definition in self.definitions.items():
            fieldnames = {field["fieldname"] for field in definition["fields"]}
            for field in definition["fields"]:
                fieldname = field["fieldname"]
                fieldtype = field.get("fieldtype")
                if fieldtype not in VALID_FIELDTYPES:
                    problems.append(f"{name}.{fieldname}: unknown fieldtype {fieldtype!r}")
                    continue
                options = field.get("options")
                if fieldtype == "Link" and not options:
                    problems.append(f"{name}.{fieldname}: Link requires options")
                if fieldtype == "Dynamic Link":
                    if not options or options not in fieldnames:
                        problems.append(
                            f"{name}.{fieldname}: Dynamic Link options must name a field"
                        )
                if fieldtype == "Select" and not options:
                    problems.append(f"{name}.{fieldname}: Select requires options")
                if fieldtype == "Currency" and options and options not in fieldnames:
                    problems.append(
                        f"{name}.{fieldname}: Currency options must name the currency field"
                    )
        self.assertEqual(problems, [], "; ".join(problems))

    def test_autoname_references_existing_field(self):
        problems = []
        for name, definition in self.definitions.items():
            fieldnames = {field["fieldname"] for field in definition["fields"]}
            autoname = definition.get("autoname") or ""
            if autoname.startswith("field:"):
                target = autoname.split(":", 1)[1]
                if target not in fieldnames:
                    problems.append(f"{name}: autoname field {target!r} not declared")
            if autoname.startswith("naming_series") and "naming_series" not in fieldnames:
                problems.append(f"{name}: autoname uses naming_series but field is absent")
        self.assertEqual(problems, [], "; ".join(problems))

    def test_tree_doctypes_declare_parent_field(self):
        problems = []
        for name, definition in self.definitions.items():
            if not definition.get("is_tree"):
                continue
            parent_field = definition.get("nsm_parent_field")
            fields = {field["fieldname"]: field for field in definition["fields"]}
            if not parent_field or parent_field not in fields:
                problems.append(f"{name}: is_tree without nsm_parent_field")
            elif fields[parent_field].get("fieldtype") != "Link":
                problems.append(f"{name}: nsm_parent_field must be a Link")
        self.assertEqual(problems, [], "; ".join(problems))

    def test_submittable_doctypes_have_amended_from(self):
        problems = []
        for name, definition in self.definitions.items():
            if not definition.get("is_submittable"):
                continue
            fieldnames = {field["fieldname"] for field in definition["fields"]}
            if "amended_from" not in fieldnames:
                problems.append(f"{name}: is_submittable without amended_from")
        self.assertEqual(problems, [], "; ".join(problems))

    def test_title_and_search_fields_exist(self):
        problems = []
        for name, definition in self.definitions.items():
            fieldnames = {field["fieldname"] for field in definition["fields"]}
            title_field = definition.get("title_field")
            if title_field and title_field not in fieldnames:
                problems.append(f"{name}: title_field {title_field!r} not declared")
            for fieldname in (definition.get("search_fields") or "").split(","):
                fieldname = fieldname.strip()
                if fieldname and fieldname not in fieldnames:
                    problems.append(f"{name}: search field {fieldname!r} not declared")
        self.assertEqual(problems, [], "; ".join(problems))

    def test_permissions_declare_roles(self):
        problems = []
        for name, definition in self.definitions.items():
            permissions = definition.get("permissions") or []
            if not permissions:
                problems.append(f"{name}: no permissions declared")
            for permission in permissions:
                if not permission.get("role"):
                    problems.append(f"{name}: permission without a role")
        self.assertEqual(problems, [], "; ".join(problems))

    def test_internal_links_resolve(self):
        """Links between our own DocTypes must point at a defined DocType."""
        defined = set(REQUIRED_DOCTYPES) | {"Employee"}
        problems = []
        for name, definition in self.definitions.items():
            for field in definition["fields"]:
                if field.get("fieldtype") != "Link":
                    continue
                target = field.get("options")
                if target in defined or target in {"Company", "Currency", "Country", "UOM", "User"}:
                    continue
                problems.append(f"{name}.{field['fieldname']}: unknown link target {target!r}")
        self.assertEqual(problems, [], "; ".join(problems))


class BusinessFieldTest(unittest.TestCase):
    """The field examples called out in the task body are present."""

    def test_account_has_parent_account(self):
        definition = _load("Account")
        fieldnames = {field["fieldname"] for field in definition["fields"]}
        self.assertIn("parent_account", fieldnames)
        parent = next(f for f in definition["fields"] if f["fieldname"] == "parent_account")
        self.assertEqual(parent["fieldtype"], "Link")
        self.assertEqual(parent["options"], "Account")

    def test_invoice_has_customer_date_and_total(self):
        definition = _load("Invoice")
        fields = {field["fieldname"]: field for field in definition["fields"]}
        self.assertEqual(fields["customer"]["fieldtype"], "Link")
        self.assertEqual(fields["customer"]["options"], "Customer")
        self.assertEqual(fields["posting_date"]["fieldtype"], "Date")
        self.assertIn("total_amount", fields)
        self.assertIn("grand_total", fields)

    def test_all_16_present(self):
        present = set()
        for path in DOCTYPE_DIR.iterdir():
            if not path.is_dir():
                continue
            json_path = path / f"{path.name}.json"
            if json_path.is_file():
                present.add(json.loads(json_path.read_text(encoding="utf-8"))["name"])
        missing = set(REQUIRED_DOCTYPES) - present
        self.assertEqual(missing, set())


if __name__ == "__main__":
    unittest.main()
