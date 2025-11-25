// Department to Issue Category Mapping
const departmentCategories = {
    'public_works': ['pothole', 'road_damage', 'drainage'],
    'electrical': ['streetlight'],
    'sanitation': ['garbage'],
    'water_dept': ['water_leak'],
    'other': ['other']
};

// Category to Department Mapping
const categoryDepartments = {
    'pothole': 'public_works',
    'road_damage': 'public_works',
    'drainage': 'public_works',
    'streetlight': 'electrical',
    'garbage': 'sanitation',
    'water_leak': 'water_dept',
    'other': 'other'
};

// Get categories for a department
const getCategoriesForDepartment = (department) => {
    return departmentCategories[department] || [];
};

// Get department for a category
const getDepartmentForCategory = (category) => {
    return categoryDepartments[category] || 'other';
};

module.exports = {
    departmentCategories,
    categoryDepartments,
    getCategoriesForDepartment,
    getDepartmentForCategory
};