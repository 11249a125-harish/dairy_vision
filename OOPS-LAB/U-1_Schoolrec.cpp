#include<iostream>
using namespace std;
class Student
{
    public:
    string name;
    int roll;
    float marks;
    void display()
    {
        cout<<"Name"<<name<<endl;
        cout<<"Roll"<<roll<<endl;
        cout<<"Marks"<<marks<<endl;
    }
};
int main()
{
    Student s1,s2,s3;
    s1.name="Harish";
    s1.roll=20;
    s1.marks=95;
    s2.name="Thrisul";
    s2.roll=21;
    s2.marks=96;
    s3.name="Thejaswi";
    s3.roll=22;
    s3.marks=97;
    s1.display();
    s2.display();
    s3.display();
    return 0;

}
