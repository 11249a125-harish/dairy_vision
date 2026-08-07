'''➡️Aim:
 //To write a Python program that accepts marks of three tests from the user and calculates the best of two test average.//

➡️Algorithm:

•Start the program.
•Accept marks for three tests from the user.
•Store all three marks in a list.
•Sort the list in descending order to arrange marks from highest to lowest.
•Select the first two marks (the highest two).
•Calculate the average of these two marks.
•Display the best of two test average.
•Stop the program.

➡️Program:'''
 marks = []
for i in range(3):
    m = float(input(f"Enter marks for Test {i+1}: "))
    marks.append(m)

marks.sort(reverse=True)
best_two_avg = sum(marks[:2]) / 2

print("Best of two test average marks:", best_two_avg)



#➡️Result:

#Thus Python program that accepts marks of three tests from the user and calculates the best of two test average implemented sucessfully.
