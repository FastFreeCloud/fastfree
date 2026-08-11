from setuptools import setup, find_packages

setup(
    name="fastfree",
    version="1.0.0",
    packages=find_packages(where="apps/fastfree_backend"),
    package_dir={"": "apps/fastfree_backend"},
)
