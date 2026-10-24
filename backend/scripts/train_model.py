import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ml.pipeline import train_and_save


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and evaluate the sentiment classifier.")
    parser.add_argument(
        "--data",
        type=Path,
        default=None,
        help="CSV with text and sentiment columns. Defaults to the included demonstration dataset.",
    )
    args = parser.parse_args()
    print(json.dumps(train_and_save(args.data), indent=2))


if __name__ == "__main__":
    main()
