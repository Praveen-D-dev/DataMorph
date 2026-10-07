import numpy as np
from typing import List, Tuple


def lttb_downsample(data: List[Tuple[float, float]], threshold: int) -> List[Tuple[float, float]]:
    """
    Largest Triangle Three Buckets (LTTB) algorithm for high-performance downsampling
    of continuous time series / numerical curves while preserving visual extrema.
    data: list of (x, y) tuples
    threshold: maximum output points
    """
    n_points = len(data)
    if threshold >= n_points or threshold <= 2:
        return data

    sampled: List[Tuple[float, float]] = []
    bucket_size = (n_points - 2) / (threshold - 2)

    a = 0  # First point
    sampled.append(data[a])

    for i in range(threshold - 2):
        # Calculate point average for next bucket (c)
        avg_range_start = int(np.floor((i + 1) * bucket_size)) + 1
        avg_range_end = min(int(np.floor((i + 2) * bucket_size)) + 1, n_points)
        
        avg_range = data[avg_range_start:avg_range_end]
        avg_x = sum(p[0] for p in avg_range) / len(avg_range) if avg_range else data[avg_range_start][0]
        avg_y = sum(p[1] for p in avg_range) / len(avg_range) if avg_range else data[avg_range_start][1]

        # Get the range for this bucket (b)
        range_offs = int(np.floor(i * bucket_size)) + 1
        range_to = int(np.floor((i + 1) * bucket_size)) + 1

        point_a_x, point_a_y = data[a]
        max_area = -1.0
        max_area_point_idx = range_offs

        for j in range(range_offs, range_to):
            # Calculate triangle area over points a, b, and average c
            p_x, p_y = data[j]
            area = abs(
                (point_a_x - avg_x) * (p_y - point_a_y) -
                (point_a_x - p_x) * (avg_y - point_a_y)
            ) * 0.5

            if area > max_area:
                max_area = area
                max_area_point_idx = j

        sampled.append(data[max_area_point_idx])
        a = max_area_point_idx

    sampled.append(data[-1])  # Always include the last point
    return sampled
