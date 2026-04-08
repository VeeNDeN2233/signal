from pathlib import Path
import urllib.request
import zipfile
import shutil
import sys


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    wrapper_dir = root / "gradle" / "wrapper"
    wrapper_dir.mkdir(parents=True, exist_ok=True)

    dist_zip = wrapper_dir / "gradle-8.7-bin.zip"
    extract_dir = wrapper_dir / "_tmp_gradle_dist"
    target_jar = wrapper_dir / "gradle-wrapper.jar"

    url = "https://services.gradle.org/distributions/gradle-8.7-bin.zip"
    print(f"Downloading {url} ...")
    with urllib.request.urlopen(url, timeout=120) as r, open(dist_zip, "wb") as f:
        shutil.copyfileobj(r, f)

    print("Extracting wrapper jar ...")
    with zipfile.ZipFile(dist_zip, "r") as zf:
        member = "gradle-8.7/lib/plugins/gradle-wrapper-8.7.jar"
        zf.extract(member, extract_dir)
        extracted = extract_dir / member
        shutil.copy2(extracted, target_jar)

    print(f"Saved: {target_jar}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

