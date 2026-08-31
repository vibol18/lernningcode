#include <stdio.h>
#include <stdlib.h>
#include <windows.h>

int main() {
    HANDLE hConsole = GetStdHandle(STD_OUTPUT_HANDLE);

    SetConsoleTextAttribute(hConsole, FOREGROUND_RED);
    printf("Red text\n");

    SetConsoleTextAttribute(hConsole, FOREGROUND_GREEN);
    printf("Green text\n");

    SetConsoleTextAttribute(hConsole, FOREGROUND_BLUE);
    printf("Blue text\n");

    SetConsoleTextAttribute(hConsole, FOREGROUND_RED | FOREGROUND_GREEN | FOREGROUND_BLUE);
    printf("White text\n");

    return 0;
}
