'''➡️ Aim:
To develop a Python program that backs up a given folder into a ZIP file using relevant modules.

➡️ Algorithm:
• Start the program.  
• Import the shutil module.  
• Accept folder name from the user.  
• Use shutil.make_archive() to create a ZIP file of the folder.  
• Display a message indicating backup success.  
• Stop the program.  

 Program:'''
import shutil

folder_name = input("Enter folder name to backup: ")
shutil.make_archive(folder_name, 'zip', folder_name)
print(f"Folder '{folder_name}' has been backed up as '{folder_name}.zip'.")

# Result:
#Thus the Python program that creates a ZIP backup of a folder is implemented successfully.
