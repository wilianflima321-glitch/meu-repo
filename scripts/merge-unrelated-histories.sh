#!/bin/bash

# Merge Unrelated Histories Script
# This script helps merge two branches with completely different commit histories

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 <target-branch> <source-branch> [options]

Merge two branches with unrelated histories.

Arguments:
    target-branch    The branch to merge into (e.g., main)
    source-branch    The branch to merge from (e.g., conflict_121225_0213)

Options:
    --strategy=<strategy>    Merge strategy: ours, theirs, or manual (default: manual)
    --no-backup              Skip creating backup branches
    --dry-run               Show what would be done without making changes
    -h, --help              Show this help message

Examples:
    $0 main conflict_121225_0213
    $0 main conflict_121225_0213 --strategy=theirs
    $0 main conflict_121225_0213 --dry-run

EOF
    exit 1
}

# Parse arguments
TARGET_BRANCH=""
SOURCE_BRANCH=""
STRATEGY="manual"
CREATE_BACKUP=true
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --strategy=*)
            STRATEGY="${1#*=}"
            shift
            ;;
        --no-backup)
            CREATE_BACKUP=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            if [ -z "$TARGET_BRANCH" ]; then
                TARGET_BRANCH="$1"
            elif [ -z "$SOURCE_BRANCH" ]; then
                SOURCE_BRANCH="$1"
            else
                print_error "Unknown argument: $1"
                usage
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$TARGET_BRANCH" ] || [ -z "$SOURCE_BRANCH" ]; then
    print_error "Both target and source branches are required"
    usage
fi

# Validate strategy
if [[ ! "$STRATEGY" =~ ^(ours|theirs|manual)$ ]]; then
    print_error "Invalid strategy: $STRATEGY. Must be 'ours', 'theirs', or 'manual'"
    exit 1
fi

print_info "========================================="
print_info "Merge Unrelated Histories"
print_info "========================================="
print_info "Target Branch: $TARGET_BRANCH"
print_info "Source Branch: $SOURCE_BRANCH"
print_info "Strategy: $STRATEGY"
print_info "Create Backup: $CREATE_BACKUP"
print_info "Dry Run: $DRY_RUN"
print_info "========================================="
echo

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Check if branches exist
if ! git rev-parse --verify "$TARGET_BRANCH" > /dev/null 2>&1; then
    print_error "Target branch '$TARGET_BRANCH' does not exist"
    exit 1
fi

if ! git rev-parse --verify "$SOURCE_BRANCH" > /dev/null 2>&1; then
    print_error "Source branch '$SOURCE_BRANCH' does not exist"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
    echo
fi

# Create backups
if [ "$CREATE_BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    print_info "Creating backup branches..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_TARGET="backup_${TARGET_BRANCH}_${TIMESTAMP}"
    BACKUP_SOURCE="backup_${SOURCE_BRANCH}_${TIMESTAMP}"
    
    git branch "$BACKUP_TARGET" "$TARGET_BRANCH"
    git branch "$BACKUP_SOURCE" "$SOURCE_BRANCH"
    
    print_success "Created backups: $BACKUP_TARGET, $BACKUP_SOURCE"
    echo
fi

# Checkout target branch
print_info "Checking out target branch: $TARGET_BRANCH"
if [ "$DRY_RUN" = false ]; then
    git checkout "$TARGET_BRANCH"
fi
echo

# Show branch information
print_info "Target branch info:"
git log --oneline "$TARGET_BRANCH" -5
echo

print_info "Source branch info:"
git log --oneline "$SOURCE_BRANCH" -5
echo

# Attempt merge
print_info "Attempting to merge $SOURCE_BRANCH into $TARGET_BRANCH..."
echo

MERGE_CMD="git merge $SOURCE_BRANCH --allow-unrelated-histories --no-ff"

if [ "$STRATEGY" = "ours" ]; then
    MERGE_CMD="$MERGE_CMD -X ours"
    print_info "Using 'ours' strategy: Target branch changes take precedence"
elif [ "$STRATEGY" = "theirs" ]; then
    MERGE_CMD="$MERGE_CMD -X theirs"
    print_info "Using 'theirs' strategy: Source branch changes take precedence"
else
    print_info "Using manual strategy: You will need to resolve conflicts manually"
fi

echo

if [ "$DRY_RUN" = true ]; then
    print_info "Would execute: $MERGE_CMD"
    exit 0
fi

# Execute merge
if $MERGE_CMD; then
    print_success "Merge completed successfully!"
    echo
    print_info "Merge commit created:"
    git log -1 --oneline
    echo
    print_info "Next steps:"
    echo "  1. Review the merge: git log --graph --oneline --all"
    echo "  2. Test your changes"
    echo "  3. Push to remote: git push origin $TARGET_BRANCH"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 1 ]; then
        print_warning "Merge has conflicts that need to be resolved"
        echo
        print_info "To resolve conflicts:"
        echo "  1. Fix conflicts in the files listed above"
        echo "  2. Stage resolved files: git add <file>"
        echo "  3. Complete merge: git commit"
        echo "  4. Or abort: git merge --abort"
        echo
        print_info "Conflict files:"
        git diff --name-only --diff-filter=U
        exit 1
    else
        print_error "Merge failed with exit code $EXIT_CODE"
        exit $EXIT_CODE
    fi
fi

print_success "========================================="
print_success "Merge completed successfully!"
print_success "========================================="
