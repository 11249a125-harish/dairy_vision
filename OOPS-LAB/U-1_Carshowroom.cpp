#include<iostream>
using namespace std;
class Car
 {
    public:
    string model;
    string company;
    float price;
    void display()
    {
        cout<<"Model"<<model<<endl;
        cout<<"Company"<<company<<endl;
        cout<<"Price"<<price<<endl;
    }
 };
 int main()
 {
    Car c1,c2,c3;
    c1.model="innova";
    c1.company="toyato";
    c1.price=50000;
    c2.model="city";
    c2.company="honda";
    c2.price=500000;
    c3.model="hyundai";
    c3.company="mahindra";
    c3.price=150000;
    c1.display();
    c2.display();
    c3.display();
    return 0;
 }
  
  
