#include <iostream>
using namespace std;

class Student {
    int id;
    string name;
    int marks[5];  
    static int totalStudents;

public:
    Student(int i, string n, int m[]) {
        id = i;
        name = n;
        for (int j = 0; j < 5; j++)
            marks[j] = m[j];
        totalStudents++;
    }

    ~Student() {
        totalStudents--;
    }

    inline int totalMarks() {
        int sum = 0;
        for (int i = 0; i < 5; i++)
            sum=sum+marks[i];
        return sum;
    }

    void display() {
        cout << "ID: " << id << ", Name: " << name << ", Total Marks: " << totalMarks() << endl;
    }

    static int getTotalStudents() {
        return totalStudents;
    }

    static Student topper(Student s1, Student s2) {
        return (s1.totalMarks() > s2.totalMarks()) ? s1 : s2;
    }
};

int Student::totalStudents = 0;

int main() {
    int marks1[5] = {80, 85, 90, 75, 88};
    int marks2[5] = {90, 88, 85, 80, 95};
    int marks3[5]={80,25,23,50,100};

    Student s1(1, "Alice", marks1);
    Student s2(2, "Bob", marks2);
    Student s3(3,"Krish",marks3);

    s1.display();
    s2.display();
    s3.display();

    cout << "Total Students: " << Student::getTotalStudents() << endl;

    Student top = Student::topper(s1, s2);
    cout << "Topper is: ";
    top.display();

    return 0;
}
