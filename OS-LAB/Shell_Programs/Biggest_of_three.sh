echo "Enter three numbers:"
read a
read b
read c
if [ $a -gt $b ] && [ $a -gt $c]
then 
   echo "Biggest number is $a"
elif [ $b -gt $c ]
then 
   echo "Biggest number is $b"
else
   echo "Biggest number is $c"
fi