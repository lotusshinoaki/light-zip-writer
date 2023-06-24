# coding: utf_8
import argparse
import zipfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('src')
    parser.add_argument('dest')
    args = parser.parse_args()

    with zipfile.ZipFile(args.src) as z:
        z.extractall(args.dest)


if __name__ == '__main__':
    main()
