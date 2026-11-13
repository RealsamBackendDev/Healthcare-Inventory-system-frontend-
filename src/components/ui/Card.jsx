export default function Card({ as: Tag = 'div', className = '', padded = true, children, ...props }) {
      return (
          <Tag
                className={`surface ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
                      {...props}
                          >
                                {children}
                                    </Tag>
                                      );
                                      }
}