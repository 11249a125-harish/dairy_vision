echo "Enter number of terms(n):"
read n
a=0
b=1
echo "Fibonacci Series:"
echo $a #displays a
echo $b #displays b
for (( i=2; i<n; i++ ))
do
 c=$(( a + b ))
 echo $c
 a=$b
 b=$c
done