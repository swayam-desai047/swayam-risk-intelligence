import os
import shutil
import zipfile
import kagglehub

def main():
    print("Initializing Credit Card Fraud Detection dataset download...")
    
    # Define local data directory
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    csv_dest_path = os.path.join(data_dir, "creditcard.csv")
    
    # If the file already exists, skip download
    if os.path.exists(csv_dest_path):
        print(f"Dataset already exists at: {csv_dest_path}")
        return
        
    try:
        # Download using kagglehub (which automatically picks up the access_token in ~/.kaggle/access_token)
        print("Connecting to Kaggle to fetch dataset 'mlg-ulb/creditcardfraud'...")
        downloaded_path = kagglehub.dataset_download("mlg-ulb/creditcardfraud")
        print(f"Dataset downloaded by kagglehub to: {downloaded_path}")
        
        # Locate the CSV file or zip file in the downloaded path
        files = os.listdir(downloaded_path)
        print(f"Files found in download directory: {files}")
        
        csv_file = None
        for file in files:
            if file.endswith(".csv"):
                csv_file = os.path.join(downloaded_path, file)
                break
            elif file.endswith(".zip"):
                zip_path = os.path.join(downloaded_path, file)
                print(f"Extracting zip file {zip_path}...")
                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(downloaded_path)
                # Recheck files after extraction
                for subfile in os.listdir(downloaded_path):
                    if subfile.endswith(".csv"):
                        csv_file = os.path.join(downloaded_path, subfile)
                        break
        
        if csv_file:
            print(f"Copying CSV file to local data folder: {csv_dest_path}")
            shutil.copy(csv_file, csv_dest_path)
            print("Dataset successfully set up!")
        else:
            raise FileNotFoundError("Could not locate the creditcard.csv file in downloaded files.")
            
    except Exception as e:
        print(f"Error during dataset download/extraction: {e}")
        print("Attempting to fallback to manual request if possible...")
        raise e

if __name__ == "__main__":
    main()
