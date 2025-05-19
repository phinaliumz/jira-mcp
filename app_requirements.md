Command-Line Kanban Board Requirements

This document contains the initial requirements for a new command-line Kanban board application.

## User Roles

The application does not have separate user roles. All users can:

* Create, modify, and view boards.
* Add, modify, and delete columns.
* Add, modify, delete, and move cards between columns.

## Functional Requirements

1.  **Board Management:** Users should be able to create multiple Kanban boards, name them, and delete them.
2.  **Column Management:** Users should be able to add columns to boards, name them, reorder them, and delete them.
3.  **Card Management:** Users should be able to add cards to columns, give them titles and descriptions, modify them, delete them, and move them between columns.
4.  **Command-Line Interface:** The application should be accessible from the command line. Users should be able to perform all functions using commands.
5.  **Data Storage:** Board, column, and card data should be stored persistently so that it is retained between application restarts.

## Non-Functional Requirements

* The application should be fast and responsive when used from the command line.
* The application should be easy to use and provide clear instructions for commands.
* The application should support at least X number of boards, Y number of columns per board, and Z number of cards per column (define X, Y, and Z).