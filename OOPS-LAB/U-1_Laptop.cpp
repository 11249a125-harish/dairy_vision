#include<iostream>
using namespace std;
class Laptop
{
    public:
    string brand;
    string processor;
    int ram;
    void display()
    {
        cout<<"Brand name"<<brand<<endl;
        cout<<"Processor"<<processor<<endl;
        cout<<"Ram size"<<ram<<endl;
    }
};
int main()
{
    Laptop l1,l2;
    l1.brand="Dell";
    l1.processor="intel i3";
    l1.ram=8;
    l2.brand="HP";
    l2.processor="AMd ryzen";
    l2.ram=16;
    l1.display();
    l2.display();
   
    return 0;
}
