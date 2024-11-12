import multer from 'multer';

// Set up storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(file.fieldname === 'banner') {
            cb(null, './uploads/banners/'); // Store banners in the 'uploads/banners' directory
        } else if (file.fieldname === 'thumbnail') {
            cb(null, './uploads/thumbnails/'); // Store thumbnails in the 'uploads/thumbnails' directory
        } else {
            cb(null, './uploads/videos/'); // Store videos in the 'uploads/videos' directory
        }
    },
    filename: (req, file, cb) => {
        // Generate a unique filename with the current timestamp and original file extension
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

// File filter function to allow only specific file types
const fileFilter = (req, file, cb) => {
    // Allowed video mime types
    const allowedVideoMimeTypes = ['video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/quicktime'];
    // Allowed image mime types for the thumbnail
    const allowedImageMimeTypes = ['image/jpg','image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];


    if ((file.fieldname === 'thumbnail' || file.fieldname === 'banner') && allowedImageMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file if it is a valid image
    } else if (file.fieldname !== 'thumbnail' && allowedVideoMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file if it is a valid video
    } else {
        cb(new Error('Invalid file type. Only video files for videos and image files for thumbnails are allowed.'), false); // Reject the file
    }
};

// Set up the multer middleware
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 
    },
    fileFilter: fileFilter
});
