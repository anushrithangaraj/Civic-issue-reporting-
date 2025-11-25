import * as tf from '@tensorflow/tfjs';

class PotholeDetector {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.roadColorRanges = this.getRoadColorRanges();
    }

    getRoadColorRanges() {
        // Common road colors (asphalt, concrete, etc.)
        return {
            asphalt: { min: [30, 30, 30], max: [120, 120, 120] }, // Dark gray to medium gray
            concrete: { min: [150, 150, 150], max: [220, 220, 220] }, // Light gray to white
            redBrick: { min: [100, 30, 30], max: [180, 80, 80] } // Reddish road surfaces
        };
    }

    async loadModel() {
        try {
            console.log('🛣️ Road Analysis Engine Initialized');
            this.isLoaded = true;
            return true;
        } catch (error) {
            console.error('Error loading model:', error);
            return false;
        }
    }

    // Advanced road surface detection
    isRoadColor(r, g, b) {
        for (const [surface, range] of Object.entries(this.roadColorRanges)) {
            const [minR, minG, minB] = range.min;
            const [maxR, maxG, maxB] = range.max;
            
            if (r >= minR && r <= maxR &&
                g >= minG && g <= maxG &&
                b >= minB && b <= maxB) {
                return true;
            }
        }
        return false;
    }

    // Advanced pothole detection with realistic analysis
    async detectPothole(imageElement) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;
            ctx.drawImage(imageElement, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let roadPixelCount = 0;
            let potentialPotholePixels = 0;
            let darkClusterCount = 0;
            let edgeIntensity = 0;
            let totalPixels = canvas.width * canvas.height;

            // Advanced analysis parameters
            const analysisParams = {
                darkThreshold: 60, // Lowered for better sensitivity
                veryDarkThreshold: 30, // Very dark areas (likely shadows or deep potholes)
                edgeThreshold: 25,
                minPotholeSize: 50, // Minimum cluster size to be considered a pothole
                roadSurfaceThreshold: 0.3 // Minimum road surface percentage
            };

            // First pass: Identify road surface and potential pothole areas
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Count road-colored pixels
                if (this.isRoadColor(r, g, b)) {
                    roadPixelCount++;
                }

                // Identify very dark areas (potential potholes)
                const brightness = (r + g + b) / 3;
                if (brightness < analysisParams.darkThreshold) {
                    potentialPotholePixels++;
                }
            }

            // Calculate road surface percentage
            const roadSurfaceRatio = roadPixelCount / totalPixels;
            
            // If image doesn't contain enough road surface, it's probably not a road image
            if (roadSurfaceRatio < analysisParams.roadSurfaceThreshold) {
                resolve(this.getNonRoadResult());
                return;
            }

            // Second pass: Advanced feature detection
            const visited = new Set();
            const clusters = [];

            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    const index = (y * canvas.width + x) * 4;
                    
                    if (visited.has(index)) continue;

                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];
                    const brightness = (r + g + b) / 3;

                    // Look for dark areas that could be potholes
                    if (brightness < analysisParams.darkThreshold) {
                        const cluster = this.floodFill(x, y, data, canvas.width, canvas.height, 
                                                     analysisParams.darkThreshold, visited);
                        
                        if (cluster.size >= analysisParams.minPotholeSize) {
                            clusters.push(cluster);
                            darkClusterCount++;
                        }
                    }
                }
            }

            // Third pass: Edge detection around potential potholes
            let strongEdgeCount = 0;
            clusters.forEach(cluster => {
                cluster.forEach(index => {
                    const edges = this.detectEdgesAtPixel(index, data, canvas.width, canvas.height);
                    if (edges > analysisParams.edgeThreshold) {
                        strongEdgeCount++;
                    }
                });
            });

            // Calculate realistic probabilities
            const potholeProbability = this.calculateRealisticProbability(
                roadSurfaceRatio,
                darkClusterCount,
                potentialPotholePixels,
                strongEdgeCount,
                totalPixels,
                clusters
            );

            const result = {
                isPothole: potholeProbability > 0.4, // More conservative threshold
                confidence: potholeProbability,
                features: {
                    roadSurfacePercentage: Math.round(roadSurfaceRatio * 100),
                    darkClusters: darkClusterCount,
                    potentialPixels: Math.round((potentialPotholePixels / totalPixels) * 100),
                    edgeIntensity: Math.round((strongEdgeCount / (clusters.length * 100)) * 100) || 0,
                    analysis: this.getRealisticAnalysis(potholeProbability, roadSurfaceRatio),
                    imageType: this.getImageType(roadSurfaceRatio)
                },
                recommendations: this.getRealisticRecommendations(potholeProbability, darkClusterCount),
                isRoadImage: roadSurfaceRatio >= analysisParams.roadSurfaceThreshold
            };

            console.log('🔍 Detection Analysis:', result);
            resolve(result);
        });
    }

    // Flood fill algorithm to find connected dark areas
    floodFill(startX, startY, data, width, height, threshold, visited) {
        const cluster = new Set();
        const stack = [[startX, startY]];
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const index = (y * width + x) * 4;
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            if (visited.has(index)) continue;
            
            visited.add(index);
            
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const brightness = (r + g + b) / 3;
            
            if (brightness < threshold) {
                cluster.add(index);
                
                // Check 8-connected neighbors
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        stack.push([x + dx, y + dy]);
                    }
                }
            }
        }
        
        return cluster;
    }

    // Detect edges around a pixel
    detectEdgesAtPixel(index, data, width, height) {
        const x = (index / 4) % width;
        const y = Math.floor((index / 4) / width);
        
        if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) return 0;
        
        let maxGradient = 0;
        
        // Sobel operator for edge detection
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const neighborIndex = ((y + dy) * width + (x + dx)) * 4;
                const currentBrightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
                const neighborBrightness = (data[neighborIndex] + data[neighborIndex + 1] + data[neighborIndex + 2]) / 3;
                
                const gradient = Math.abs(currentBrightness - neighborBrightness);
                maxGradient = Math.max(maxGradient, gradient);
            }
        }
        
        return maxGradient;
    }

    // Realistic probability calculation
    calculateRealisticProbability(roadRatio, clusters, darkPixels, edges, totalPixels, clusterData) {
        let probability = 0;

        // Base probability based on road surface (0-20%)
        probability += Math.min(roadRatio * 0.2, 0.2);

        // Cluster-based detection (0-40%)
        if (clusters > 0) {
            const clusterScore = Math.min(clusters * 0.1, 0.4);
            probability += clusterScore;
        }

        // Dark pixel density (0-20%)
        const darkDensity = darkPixels / totalPixels;
        probability += Math.min(darkDensity * 2, 0.2);

        // Edge intensity (0-20%)
        const edgeDensity = edges / (clusterData.length * 100) || 0;
        probability += Math.min(edgeDensity * 0.5, 0.2);

        // Penalty for unrealistic scenarios
        if (roadRatio < 0.1) probability *= 0.3; // Not enough road
        if (clusters > 10) probability *= 0.7; // Too many clusters (probably noise)

        return Math.min(Math.max(probability, 0.05), 0.95);
    }

    getNonRoadResult() {
        return {
            isPothole: false,
            confidence: 0.1,
            features: {
                roadSurfacePercentage: 0,
                darkClusters: 0,
                potentialPixels: 0,
                edgeIntensity: 0,
                analysis: "❌ Not a road image - insufficient road surface detected",
                imageType: "non-road"
            },
            recommendations: "Please upload a clear photo of a road surface for accurate pothole detection.",
            isRoadImage: false
        };
    }

    getRealisticAnalysis(probability, roadRatio) {
        if (roadRatio < 0.3) {
            return "⚠️ Limited road surface visible - analysis may be inaccurate";
        }
        
        if (probability > 0.7) return "🚧 High confidence - Strong pothole characteristics detected";
        if (probability > 0.5) return "⚠️ Medium confidence - Possible pothole detected";
        if (probability > 0.3) return "🔍 Low confidence - Minor irregularities found";
        if (probability > 0.1) return "💡 Very low confidence - Minimal pothole indicators";
        return "✅ Clear road - No significant pothole features detected";
    }

    getImageType(roadRatio) {
        if (roadRatio > 0.6) return "good-road";
        if (roadRatio > 0.3) return "partial-road";
        return "non-road";
    }

    getRealisticRecommendations(probability, clusters) {
        if (probability > 0.6) {
            return `Strong evidence of ${clusters} potential pothole(s). Consider reporting.`;
        } else if (probability > 0.4) {
            return "Possible road damage detected. Review carefully before reporting.";
        } else if (probability > 0.2) {
            return "Minor irregularities found. May not require immediate attention.";
        } else {
            return "Road appears to be in good condition. No action needed.";
        }
    }

    // Validate if image is suitable for pothole detection
    validateImageForPotholeDetection(imageElement) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;
            ctx.drawImage(imageElement, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let roadPixelCount = 0;
            let totalPixels = canvas.width * canvas.height;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                if (this.isRoadColor(r, g, b)) {
                    roadPixelCount++;
                }
            }

            const roadRatio = roadPixelCount / totalPixels;
            const isValid = roadRatio > 0.3; // At least 30% road surface

            resolve({
                isValid,
                roadPercentage: Math.round(roadRatio * 100),
                recommendation: isValid ? 
                    "✅ Suitable for pothole detection" : 
                    "❌ Image may not show enough road surface"
            });
        });
    }
}

// Create singleton instance
const potholeDetector = new PotholeDetector();

export default potholeDetector;