#!/bin/bash

# Get the list of modified files
files=$(git diff --cached --name-only)

# Array to hold services that need their tests to be run
services_to_test=()

# Identify the modified services
for file in $files; do
    if [[ $file == packages/* ]]; then
        # Extract service name from the filepath
        service_name=$(echo "$file" | cut -d'/' -f2)

        # Check if service is already in the array, if not add it
        if ! [[ " ${services_to_test[@]} " =~ " ${service_name} " ]]; then
            services_to_test+=("$service_name")
        fi
    fi
done

# Run tests for the modified services
for service in "${services_to_test[@]}"; do
    echo "Running tests for $service"

    # Set up the vitest command to run tests for the specific service
    VITEST_CMD="yarn vitest run --passWithNoTests"

    # Run vitest for the modified service
    $VITEST_CMD

    # Check exit status of vitest to see if tests passed
    if [ $? -ne 0 ]; then
        echo "Tests failed for $service. Aborting commit."
        exit 1
    fi
done

# If all tests pass
exit 0
