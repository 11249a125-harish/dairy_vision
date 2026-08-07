'''➡️ Aim:
To write a Python program to implement insertion sort and merge sort algorithms using lists.

➡️ Algorithm:
• Start the program.  
• Accept a list of numbers.  
• For insertion sort:
   - Traverse the list from the second element onward.
   - Compare the current element with previous elements and insert it in correct order.
• For merge sort:
   - Recursively divide the list into two halves until one element remains.
   - Merge the two halves in sorted order.
• Display both sorted lists.
• Stop the program.

➡️ Program:'''
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and key < arr[j]:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    while left and right:
        if left[0] < right[0]:
            result.append(left.pop(0))
        else:
            result.append(right.pop(0))
    result += left + right
    return result

nums = [12, 11, 13, 5, 6]
print("After Insertion Sort:", insertion_sort(nums.copy()))
print("After Merge Sort:", merge_sort(nums.copy()))

'''➡️ Result:
Thus the Python program that implements insertion sort and merge sort using lists is executed successfully.'''
