import os

def find_and_print_cdr_values(root_path):
    for dirpath, dirnames, filenames in os.walk(root_path):
        for filename in filenames:
            if filename.lower().endswith('.txt'):
                file_path = os.path.join(dirpath, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            if 'CDR' in line:
                                print(f"{file_path}: {line.strip()}")
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print(f"Usage: python {os.path.basename(__file__)} <root_directory>")
        exit(2)
    root_dir = sys.argv[1]
    find_and_print_cdr_values(root_dir)

# Example usage:
# find_and_print_cdr_values('/path/to/search')