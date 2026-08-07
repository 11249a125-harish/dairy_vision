# 3a EvenOdd
echo "Enter a number:"
read n
if [ $((n % 2)) -eq 0 ]
then
  echo "The number is Even"
else
  echo "The number is Odd"
fi
