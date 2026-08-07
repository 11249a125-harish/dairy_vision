'''➡️ Aim:
To write a Python program using inheritance to calculate areas of triangle, circle, and rectangle.

➡️ Algorithm:
• Start the program.  
• Create a base class Shape.  
• Create derived classes Triangle, Circle, and Rectangle inheriting from Shape.  
• Define methods to calculate area in each derived class.  
• Accept required dimensions from the user.  
• Call area methods to display the area.  
• Stop the program.  

➡️ Program:'''
import math

class Shape:
    pass

class Triangle(Shape):
    def area(self, base, height):
        return 0.5 * base * height

class Circle(Shape):
    def area(self, radius):
        return math.pi * radius ** 2

class Rectangle(Shape):
    def area(self, length, width):
        return length * width

t = Triangle()
c = Circle()
r = Rectangle()

print("Triangle area:", t.area(10, 5))
print("Circle area:", c.area(7))
print("Rectangle area:", r.area(8, 6))

'''➡️ Result:
Thus the Python program using inheritance to calculate areas of triangle, circle, and rectangle is executed successfully'''
