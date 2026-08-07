#include<iostream>
using namespace std;
class Book
{
    public:
    string title;
    string author;
    float price;
    void display()
    {
        cout<<"Title"<<title<<endl;
        cout<<"Author"<<author<<endl;
        cout<<"price"<<price<<endl;

    }
};
int main()
{
    Book b1,b2;
    b1.title="oops";
    b1.author="gopal";
    b1.price=1000;
    b2.title="python";
    b2.author="krishna";
    b2.price=500;
    b1.display();
    b2.display();
    return 0;
}
