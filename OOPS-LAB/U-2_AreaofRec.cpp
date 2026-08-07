#include <iostream>
using namespace std;

class Rectangle {
    float length, breadth;   

public:
    Rectangle(float l, float b) {
        length = l;
        breadth = b;
    }

    inline float area() {
        return length * breadth;
    }
};

int main() {
    float l, b;

    cout << "Enter length of rectangle: ";
    cin >> l;

    cout << "Enter breadth of rectangle: ";
    cin >> b;
    Rectangle rect(l, b);
    cout << "Area of Rectangle = " << rect.area() << endl;

    return 0;
}
