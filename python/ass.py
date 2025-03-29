import sys


def sus(x, y):
    print(x + y)



if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python ass.py <x> <y>")
    else:
        x = int(sys.argv[1])
        y = int(sys.argv[2])
        sus(x, y)


