import pandas as pd
import os

# thanks chatGPT

cwd = os.getcwd()
# Path to the large CSV file
input_file_path = f'{cwd}/dataset_pathing_expanded.csv'
output_file_path = f'{cwd}/dataset_pathing_extra_light.csv'

# Load the CSV file in chunks to handle large files
chunksize = 100000  # Adjust the chunk size as needed
chunks = pd.read_csv(input_file_path, chunksize=chunksize)

# Initialize an empty DataFrame to concatenate the chunks
data = pd.concat(chunks)

# Calculate the number of rows to keep (top 1%)
num_rows = len(data)
top_10_percent_rows = int(num_rows * 0.01)

# Get the top 10% of the data
top_10_percent_data = data.head(top_10_percent_rows)

# Write the top 10% of the data to a new CSV file
top_10_percent_data.to_csv(output_file_path, index=False)

print(f'Top 10% of the data has been saved to {output_file_path}')
