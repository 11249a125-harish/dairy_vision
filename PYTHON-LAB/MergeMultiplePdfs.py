'''➡️ Aim:
To write a Python program that merges selected pages from multiple PDFs into a new PDF.

➡️ Algorithm:
• Start the program.  
• Import PyPDF2 module.  
• Open multiple PDF files in read-binary mode.  
• Create a PdfWriter object for output PDF.  
• Select specific pages from each PDF and add them to the writer object.  
• Write the combined pages to a new PDF file.  
• Close all files.  
• Stop the program.  

➡️ Program:'''
import PyPDF2

pdfs = ["file1.pdf", "file2.pdf"]
writer = PyPDF2.PdfWriter()

for pdf_file in pdfs:
    reader = PyPDF2.PdfReader(pdf_file)
    # Example: add first page from each PDF
    writer.add_page(reader.pages[0])

with open("merged.pdf", "wb") as out:
    writer.write(out)

print("Selected pages merged into 'merged.pdf'.")

'''➡️ Result:
Thus the Python program that merges selected pages from multiple PDFs into a new PDF is implemented successfully.'''
