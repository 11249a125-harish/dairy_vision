#include<iostream>
using namespace std;
class Account
{
    public:
    int accno;
    string name;
    float balance;
    void display()
     {
        cout<<"Acc no"<<accno<<"Name"<<name<<"Balance"<<balance<<endl;
     }    
};
int main()
{
    Account a1,a2;
    a1.accno=125;
    a1.name="Harish";
    a1.balance=10000;
    a2.accno=126;
    a2.name="Monika";
    a2.balance=5000;
    a1.display();
    a2.display();
    return 0;

}
