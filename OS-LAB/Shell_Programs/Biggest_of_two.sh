echo "Enter first number:"
read a
echo "Enter second number:"
read b
if [ $a -gt $b ]
then 
  echo "Bigger number is $a"
else
  echo "Bigger number is $b"
fi